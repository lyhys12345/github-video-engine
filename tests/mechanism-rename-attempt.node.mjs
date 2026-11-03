import {rename, symlink} from 'node:fs/promises';

const [target, foreign] = process.argv.slice(2);
try {
  await rename(target, target + '-moved');
} catch (error) {
  if (['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) {
    console.log('rename denied: ' + error.code);
    process.exit(0);
  }
  throw error;
}
await symlink(foreign, target, 'junction');
throw new Error('The attacker replaced the publication directory');
