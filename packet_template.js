

module.exports.connack = ()=>({
  cmd: 'connack',
  retain: false,
  qos: 0,
  dup: false,
  length: 2,
  topic: null,
  payload: null,
  sessionPresent: false,
  returnCode: 5
})

module.exports.suback = (messageId,granted)=> ({
  cmd: 'suback',
  retain: false,
  qos: 0,
  dup: false,
  length: 3,
  topic: null,
  payload: null,
  granted: granted,
  messageId: messageId
})
module.exports.puback = (messageId)=>({
  cmd: 'puback',
  retain: false,
  qos: 0,
  dup: false,
  length: 2,
  topic: null,
  payload: null,
  messageId: messageId
})
module.exports.pubrec = (messageId)=>({
  cmd: 'pubrec',
  retain: false,
  qos: 0,
  dup: false,
  length: 2,
  topic: null,
  payload: null,
  messageId: messageId
})
