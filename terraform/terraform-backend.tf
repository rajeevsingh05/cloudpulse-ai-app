terraform {
  backend "azurerm" {
    resource_group_name  = "rajeevsingh"
    storage_account_name = "cloudpulsetfstaterajeev"
    container_name       = "tfstate"
    key                  = "cloudpulse.tfstate"
    subscription_id      = "e25c0a93-619e-4b0f-8713-ada2c8e89425"
    use_msi              = true
  }
}