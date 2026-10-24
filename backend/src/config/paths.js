import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(configDirectory, '../..');
export const uploadDirectory = path.join(backendRoot, 'uploads');
