import { execSync } from 'child_process';
try {
  console.log(execSync('python3 -m pip --version').toString());
} catch (e) {
  console.log('pip not found');
}
