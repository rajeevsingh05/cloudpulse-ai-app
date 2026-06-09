variable "subscription_id" {
  description = "Azure Subscription ID where resources will be created"
  type        = string
}

variable "resource_group_name" {
  description = "Azure Resource Group name used for CloudPulse infrastructure"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "centralindia"
}

variable "project_name" {
  description = "Project prefix used for naming Azure resources"
  type        = string
  default     = "cloudpulse"
}

variable "acr_name" {
  description = "Globally unique Azure Container Registry name"
  type        = string
}

variable "aks_cluster_name" {
  description = "Azure Kubernetes Service cluster name"
  type        = string
  default     = "cloudpulse-aks"
}