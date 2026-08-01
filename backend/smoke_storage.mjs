import 'dotenv/config';
import { getStorageProvider } from './src/services/storage/StorageService.js';

const provider = getStorageProvider();
console.log('provider:', provider.constructor.name);

const key = `smoke-test/probe-${Date.now()}.txt`;
const payload = Buffer.from('sprintive storage probe');

const up = await provider.upload(key, payload, { contentType: 'text/plain' });
console.log('upload ->', up);

const exists = await provider.exists(key);
console.log('exists ->', exists);

const down = await provider.download(key);
console.log('download matches ->', down.equals(payload), `(${down.byteLength} bytes)`);

const signed = await provider.getSignedUrl(key, 60);
console.log('signedUrl prefix ->', signed.slice(0, 60));

await provider.delete(key);
console.log('deleted ->', !(await provider.exists(key)));
