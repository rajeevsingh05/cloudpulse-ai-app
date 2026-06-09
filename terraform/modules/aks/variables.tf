variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "dns_prefix" {
  type = string
}

variable "node_pool_name" {
  type    = string
  default = "system"
}

variable "vm_size" {
  type    = string
  default = "Standard_D2as_v5"
}

variable "node_count" {
  type    = number
  default = 1
}

variable "vnet_subnet_id" {
  type = string
}

variable "tags" {
  type = map(string)
}