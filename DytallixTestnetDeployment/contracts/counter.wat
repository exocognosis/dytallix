;; Minimal WAT counter contract for demo
(module
  (memory (export "memory") 1)
  ;; memory[0..3] holds the counter as little-endian u32
  (func (export "get") (result i32)
    (i32.load (i32.const 0))
  )
  (func (export "increment") (result i32)
    (local $v i32)
    (local.set $v (i32.load (i32.const 0)))
    (local.set $v (i32.add (local.get $v) (i32.const 1)))
    (i32.store (i32.const 0) (local.get $v))
    (local.get $v)
  )
)
