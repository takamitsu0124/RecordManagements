import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const projectId = 'recordmanagements-756bf';
const defaultBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(process.cwd(), 'recordmanagements-756bf-firebase-adminsdk-g78ip-14eca293e2.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account JSON not found at', serviceAccountPath);
  process.exit(1);
}
const serviceAccountJson = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountJson),
  storageBucket: defaultBucket,
});

const bucket = admin.storage().bucket();
const srcRoot = path.resolve(process.cwd(), 'scripts/skill-master/source-images');

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const res = path.resolve(dir, e.name);
    if (e.isDirectory()) {
      files.push(...await walk(res));
    } else if (e.isFile()) {
      files.push(res);
    }
  }
  return files;
}

(async () => {
  try {
    if (!fs.existsSync(srcRoot)) {
      console.error('Source images directory not found:', srcRoot);
      process.exit(1);
    }
    const files = await walk(srcRoot);
    console.log(`Found ${files.length} files. Starting upload to bucket: ${defaultBucket}`);
    let count = 0;
    for (const filePath of files) {
      const rel = path.relative(srcRoot, filePath).split(path.sep).join('/');
      const destination = `skill-master/source-images/${rel}`;
      await bucket.upload(filePath, {
        destination,
        gzip: true,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });
      count++;
      if (count % 50 === 0) console.log(`Uploaded ${count}/${files.length} files...`);
    }
    console.log(`Upload complete: ${count}/${files.length} files uploaded.`);
    process.exit(0);
  } catch (err) {
    console.error('Upload failed:', err);
    process.exit(1);
  }
})();
