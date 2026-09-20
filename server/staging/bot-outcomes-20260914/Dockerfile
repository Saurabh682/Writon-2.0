FROM asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api@sha256:a0a78059820fd28aac5b3908084a8f467db88ed29c4e7484fb6c45c917b11bc2
WORKDIR /app
RUN node --input-type=commonjs -e "const fs=require('fs'),c=require('crypto');for(const [p,h] of [['src/bot-engine/master-scheduler.js','37a2dcff21441378c80c858911451aa3dfd44eedc4208cbbd9c361ddaea3b1a5'],['src/routes/admin-bots.js','ce20931f09929dd3fd2f55d4f471bedf373a5ae276c7a4e7ea703d136c00cd1f']]){const actual=c.createHash('sha256').update(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')).digest('hex');console.log(p,actual);if(actual!==h)throw Error('Deployment baseline differs: '+p)}"
COPY master-scheduler.js ./src/bot-engine/master-scheduler.js
COPY admin-bots.js ./src/routes/admin-bots.js
RUN node --check src/bot-engine/master-scheduler.js && node --check src/routes/admin-bots.js
