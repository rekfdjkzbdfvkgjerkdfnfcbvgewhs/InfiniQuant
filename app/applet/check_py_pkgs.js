import { execSync } from 'child_process';
try {
  console.log(execSync('python3 -c "import numpy, pandas, scipy, statsmodels; print(\'All installed\')"').toString());
} catch (e) {
  console.log('Missing packages');
}
