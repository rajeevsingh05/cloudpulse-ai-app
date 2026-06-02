terraform {
  backend "azurerm" {
    resource_group_name  = "rajeevsingh"
    storage_account_name = "cloudpulsetfstaterajeev"
    container_name       = "tfstate"
    key                  = "cloudpulse.tfstate"
    use_msi              = true
  }
}