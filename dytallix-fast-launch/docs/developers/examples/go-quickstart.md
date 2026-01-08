---
title: "Go Quickstart"
---

# Go Quickstart

Interact with Go client.

> Last updated: 2025-08-20

```go
package main
import "github.com/dytallix/sdk/go"
func main(){
  c := sdk.NewClient("https://rpc.testnet.dytallix.example")
  _ = c.Status()
}
```

Next: [Validator Node Setup](../../operators/validator-node-setup.md)
