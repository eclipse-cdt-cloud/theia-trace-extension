const fs = require("fs")
// read commit message from file path provided by $HUSKY_GIT_PARAMS
const commit_msg_path = require('path').resolve(process.argv[2])

let commit_msg = fs.readFileSync(commit_msg_path, "utf-8").split('\n');

commit_msg.pop()
const signed_off = commit_msg.pop()
const regex_signed_off = /^Signed-off-by: [a-zA-Z][a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]+[a-zA-Z] <(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))>$/
if (!regex_signed_off.test(signed_off)) {
  console.error(`\nREJECTED: Signature not found or in wrong format.\n` +
    `To avoid signature format error, commit with option -s (requires username & email in "git config")\n`)
  process.exit(1)
}

commit_msg.push("*** All hooks passed ***")
commit_msg.push("")
commit_msg.push(signed_off)
fs.writeFileSync(commit_msg_path, commit_msg.join("\n"))