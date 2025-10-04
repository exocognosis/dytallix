vault {
  address = "http://127.0.0.1:8200"
  
  # For production, use AppRole auth or other secure method
  # Never hardcode tokens in this file
  
  retry {
    num_retries = 5
  }
}

auto_auth {
  method {
    type = "approle"
    
    config = {
      role_id_file_path = "/etc/dytallix/vault-role-id"
      secret_id_file_path = "/etc/dytallix/vault-secret-id"
      remove_secret_id_file_after_reading = false
    }
  }
  
  sink {
    type = "file"
    config = {
      path = "/var/run/dytallix/vault-token"
      mode = 0600
    }
  }
}

template {
  source      = "/etc/dytallix/templates/signing-key.tmpl"
  destination = "/var/run/dytallix/signing-key.json"
  perms       = "0600"
  command     = "systemctl reload dytallixd"
}
