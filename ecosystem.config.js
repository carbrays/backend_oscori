module.exports = {
  apps : [{
    name: "oscori",
    script: "server/server.js",
    instances: 2,
	exec_mode: 'cluster'
  }]
}
