output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "acr_login_server" {
  value = module.acr.login_server
}

output "aks_cluster_name" {
  value = module.aks.name
}

output "log_analytics_workspace_name" {
  value = module.log_analytics.name
}

output "vnet_name" {
  value = module.networking.vnet_name
}

output "aks_subnet_id" {
  value = module.networking.subnet_id
}