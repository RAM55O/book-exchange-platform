# 1. Generate an RSA private key
resource "tls_private_key" "custom_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# 2. Register the public key with AWS EC2
resource "aws_key_pair" "generated_key" {
  key_name_prefix = "${var.key_name}-"
  public_key      = tls_private_key.custom_key.public_key_openssh
}

# 3. Save the private key (.pem) to your local disk
resource "local_file" "private_key" {
  content         = tls_private_key.custom_key.private_key_pem
  filename        = "${path.module}/terraform-key.pem"
  file_permission = "0400"
}
