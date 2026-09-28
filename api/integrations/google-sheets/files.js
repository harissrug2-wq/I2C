export default async function handler(req, res) {
  return res.status(501).json({ ok:false, error:'Google Sheets file discovery is being configured.' });
}
