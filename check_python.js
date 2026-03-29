import { execSync } from 'child_process';
try {
  console.log(execSync('python3 --version').toString());
} catch (e) {
  console.log('Python not found');
}
