import { spawn } from 'child_process';
import { unlink } from 'fs/promises';

export async function transcribe(audioPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', ['transcribe.py', audioPath]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', async (code) => {
      try {
        await unlink(audioPath);
      } catch {
        console.warn(`Failed to delete temp file: ${audioPath}`);
      }

      if (code !== 0) {
        reject(new Error(`Whisper exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);

        if (!result.success) {
          reject(new Error(`Whisper error: ${result.error}`));
          return;
        }

        resolve(result.text);
      } catch {
        reject(new Error(`Failed to parse Whisper JSON: ${stdout}`));
      }
    });
  });
}
