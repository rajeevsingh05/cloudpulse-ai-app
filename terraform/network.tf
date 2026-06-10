module "networking" {
  source = "./modules/networking"

  vnet_name           = "${var.project_name}-vnet"
  subnet_name         = "${var.project_name}-aks-subnet"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name

  address_space   = ["10.20.0.0/16"]
  subnet_prefixes = ["10.20.1.0/24"]
}