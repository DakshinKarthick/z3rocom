import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WORKER_DIR = path.resolve(__dirname, '..', 'worker');
const WORKER_PATH = path.join(WORKER_DIR, 'issue_classifier.py');

console.log('Worker path:', WORKER_PATH);

async function testClassifier(text) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [WORKER_PATH, '--analyze', text], {
      cwd: WORKER_DIR,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}\nOutput: ${stdout}`));
        }
      } else {
        reject(new Error(`Python exited with code ${code}: ${stderr}`));
      }
    });

    python.on('error', (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });

    setTimeout(() => {
      python.kill();
      reject(new Error('Classification timed out'));
    }, 10000);
  });
}

async function main() {
  console.log('Testing issue classifier...\n');

  try {
    const result = await testClassifier('Database connection pool exhausted when handling concurrent connections');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
