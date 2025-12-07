const major = parseInt(process.versions.node.split('.')[0], 10);

if (major < 20) {
  console.error(
  `\n❌ This package requires Node.js 20+.\n` +
  `   Current version : ${process.versions.node}\n` +
  `   Please upgrade to Node.js 20+.\n\n` +
  `   ❗ Paket ini memerlukan Node.js 20+.\n` +
  `   Versi saat ini : ${process.versions.node}\n` +
  `   Silakan upgrade ke Node.js 20+.\n`
);
  process.exit(1);
}