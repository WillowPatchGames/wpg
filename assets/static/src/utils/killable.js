function killable(func, interval) {
  var killer = {};
  killer.func = func;
  killer.interval = interval;
  killer.kill = () => { clearTimeout(killer.timeout) };
  killer.exec = () => { killer.kill() ; killer.func() ; killer.restart() };
  killer.restart = () => { killer.timeout = setTimeout(() => { killer.exec() }, killer.interval) };
  killer.reset = () => { killer.kill() ; killer.restart() };
  return killer;
}

export {
  killable
};
