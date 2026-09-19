import { genererFacturesRecurrentesDues } from '../lib/recurring';

genererFacturesRecurrentesDues()
  .then((n) => {
    console.log(`${n} facture(s) générée(s) en brouillon.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
