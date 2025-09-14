from synthetic_data_gen import SyntheticDataGen

def test_stream_shapes():
    gen = SyntheticDataGen(seed=123)
    t = gen._normal_op()
    assert t.block_height > 0
    assert t.mempool_size >= 0
    assert t.avg_tx_value >= 0
