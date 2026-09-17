output "vpc_id" {
  description = "ID of the VPC."
  value       = aws_vpc.main.id
}

output "subnet_id" {
  description = "ID of the public subnet."
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "ID of the EC2 security group."
  value       = aws_security_group.ec2.id
}

output "instance_id" {
  description = "ID of the EC2 instance."
  value       = aws_instance.app.id
}

output "instance_public_ip" {
  description = "Public IP of the EC2 instance."
  value       = aws_instance.app.public_ip
}

output "key_name" {
  description = "Name of the AWS key pair created."
  value       = aws_key_pair.generated_key.key_name
}

output "private_key_file" {
  description = "Path to the locally saved private key (.pem) file."
  value       = local_file.private_key.filename
}

output "ssh_command" {
  description = "Example command to SSH into the EC2 instance."
  value       = "ssh -i ${local_file.private_key.filename} ec2-user@${aws_instance.app.public_ip}"
}
