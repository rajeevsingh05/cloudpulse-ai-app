data "azurerm_client_config" "current" {}

module "key_vault" {
  source = "./modules/key-vault"

  name                = "${var.project_name}-kv"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  tenant_id           = data.azurerm_client_config.current.tenant_id

  tags = {
    project     = "CloudPulse AI"
    environment = "shared"
  }
}