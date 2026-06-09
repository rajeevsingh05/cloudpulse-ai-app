module "log_analytics" {
  source = "./modules/log-analytics"

  name                = "${var.project_name}-logs"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  retention_in_days   = 30
}