// ReadyCheck tag encryption, version 2 (shared by the app, the dashboard and tests).
// Each company has an ECDH P-256 key pair. Phones hold only the PUBLIC key: they can lock a record but not unlock one.
// The base station holds the PRIVATE key. Per record: fresh ephemeral key pair -> ECDH shared secret
// -> HKDF-SHA256 (info "ReadyCheck tag v2") -> AES-256-GCM.
// Format: "RC2." + keyId + "." + base64url( ephemeralPublicKey(65) | iv(12) | ciphertext+tag )
(function(g){
  const enc = new TextEncoder(), dec = new TextDecoder(), INFO = enc.encode('ReadyCheck tag v2');
  const b64url = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  const EC = {name: 'ECDH', namedCurve: 'P-256'};
  async function aesFrom(priv, pub, usage){
    const bits = await crypto.subtle.deriveBits({name: 'ECDH', public: pub}, priv, 256);
    const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: INFO}, hk, {name: 'AES-GCM', length: 256}, false, [usage]);
  }
  async function newCompanyKeys(){
    const kp = await crypto.subtle.generateKey(EC, true, ['deriveBits']);
    const pub = await crypto.subtle.exportKey('jwk', kp.publicKey), priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const kid = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(pub.x + pub.y)))).slice(0, 6);
    return {kid, pub: {kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y}, priv: {kty: priv.kty, crv: priv.crv, x: priv.x, y: priv.y, d: priv.d}};
  }
  async function sealForCompany(pubJwk, kid, obj){
    const pub = await crypto.subtle.importKey('jwk', pubJwk, EC, false, []);
    const eph = await crypto.subtle.generateKey(EC, true, ['deriveBits']);
    const ephRaw = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
    const key = await aesFrom(eph.privateKey, pub, 'encrypt'), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, enc.encode(JSON.stringify(obj))));
    const all = new Uint8Array(65 + 12 + ct.length); all.set(ephRaw); all.set(iv, 65); all.set(ct, 77);
    return `RC2.${kid}.${b64url(all)}`;
  }
  async function openWithPrivate(privJwk, str){
    const m = String(str).trim().match(/^RC2\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/); if(!m) throw new Error('Not a ReadyCheck v2 record');
    const all = fromB64url(m[2]);
    const priv = await crypto.subtle.importKey('jwk', privJwk, EC, false, ['deriveBits']);
    const eph = await crypto.subtle.importKey('raw', all.slice(0, 65), EC, false, []);
    const key = await aesFrom(priv, eph, 'decrypt');
    const pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: all.slice(65, 77)}, key, all.slice(77));
    return {kid: m[1], data: JSON.parse(dec.decode(pt))};
  }
  g.RCCrypto = {newCompanyKeys, sealForCompany, openWithPrivate, b64url, fromB64url};
})(typeof window !== 'undefined' ? window : globalThis);
