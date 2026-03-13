from attack_injector import AttackInjector, AttackConfig
from synthetic_data_gen import Telemetry

def test_attack_injection_probability():
    inj = AttackInjector(seed=123, config=AttackConfig(prob=1.0, severity=0.5))
    t = Telemetry(0.0,1,100,50,100,0.5,20,100,100,1.0,1000)
    t2, kind = inj.maybe_corrupt(t)
    assert kind is not None


def test_attack_injection_noop():
    inj = AttackInjector(seed=123, config=AttackConfig(prob=0.0, severity=0.5))
    t = Telemetry(0.0,1,100,50,100,0.5,20,100,100,1.0,1000)
    t2, kind = inj.maybe_corrupt(t)
    assert kind is None
    assert t2 == t
