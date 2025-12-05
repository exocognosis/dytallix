from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_audit_vulnerable():
    response = client.post("/audit", json={
        "contract_code": "contract Vulnerable { function kill() public { selfdestruct(msg.sender); } }",
        "contract_hash": "0x123abc"
    })
    assert response.status_code == 200
    data = response.json()
    print("Vulnerable Contract Response:", data)
    assert data["score"] < 1.0
    assert "Detected 'selfdestruct' - High Risk" in data["issues"]
    assert data["model_id"] == "code-auditor"
    assert "signature" in data

def test_audit_safe():
    response = client.post("/audit", json={
        "contract_code": "contract Safe { function deposit() public payable {} }",
        "contract_hash": "0xsafe123"
    })
    assert response.status_code == 200
    data = response.json()
    print("Safe Contract Response:", data)
    assert data["score"] == 1.0
    assert len(data["issues"]) == 0

if __name__ == "__main__":
    test_audit_vulnerable()
    test_audit_safe()
    print("All tests passed!")
