module "aks" {
  source = "./modules/aks"

  name                = var.aks_cluster_name
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  dns_prefix          = "${var.project_name}-aks"

  node_pool_name = "system"
  vm_size        = "Standard_D2as_v5"
  node_count     = 1
  vnet_subnet_id = module.networking.subnet_id

  tags = {
    project     = "CloudPulse AI"
    environment = "shared"
  }
}