import { traiterRelancesImpayes } from '../lib/reminders';

traiterRelancesImpayes()
  .then((n) => {
    console.log(`${n} relance(s) envoyée(s).`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
