# Create a minimal WASM contract binary
echo "Creating minimal WASM contract for testing..."

# This creates a simple valid WASM module that can be deployed
# In a real scenario, this would be compiled from Rust or other language
python3 << 'EOF'
# Create minimal valid WASM module
wasm_bytes = [
    # WASM magic number
    0x00, 0x61, 0x73, 0x6d,
    # WASM version (1)
    0x01, 0x00, 0x00, 0x00,
    # Type section
    0x01, 0x07,  # section code + size
    0x01,        # 1 type
    0x60, 0x00, 0x01, 0x7f,  # function type: () -> i32
    # Function section
    0x03, 0x02,  # section code + size
    0x01, 0x00,  # 1 function, type 0
    # Export section
    0x07, 0x0a,  # section code + size
    0x01,        # 1 export
    0x08, 0x67, 0x65, 0x74, 0x5f, 0x63, 0x6f, 0x75, 0x6e, 0x74,  # "get_count"
    0x00, 0x00,  # function export, function 0
    # Code section
    0x0a, 0x06,  # section code + size
    0x01,        # 1 function body
    0x04,        # body size
    0x00,        # 0 locals
    0x41, 0x2a,  # i32.const 42
    0x0b         # end
]

with open('counter.wasm', 'wb') as f:
    f.write(bytes(wasm_bytes))

print(f"Created counter.wasm with {len(wasm_bytes)} bytes")
EOF

echo "WASM contract created successfully!"