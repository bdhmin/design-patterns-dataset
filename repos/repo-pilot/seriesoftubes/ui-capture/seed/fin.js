const path=require('node:path');const { load } = require('../../tests/harness');
const save=require('fs').readFileSync(path.join(__dirname,'save.json'),'utf8');
const { ev } = load({ seed: 5, storage:{'sot-save-v1:aa':save,'sot-tut':'1'} });
ev(`S=migrate(${save});compute();`);
console.log(ev(`JSON.stringify({rev:R.revMo,cost:R.costMo,R_cost:R.cost,R_rev:R.rev})`));
