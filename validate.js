validate_func(user_data,req)  {

  if (!(user_data && user_data.rules) || !req) {
    return false
  }

  //mqtt match taken https://github.com/ralphtheninja/mqtt-match
  const mqtt_match = (filter,topic)=> {
    const filterArray = filter.split('/')
    const length = filterArray.length
    const topicArray = topic.split('/')

    for (var i = 0; i < length; ++i) {
      var left = filterArray[i]
      var right = topicArray[i]
      if (left === '#') return true
      if (left !== '+' && left !== right) return false
    }

    return length === topicArray.length
  }



  req = `${req.protocol}/${req.method}/${req.host}/${req.port}/${req.path}`
  return !!user_data.rules.find((rule)=>mqtt_match(rule,req))

}
