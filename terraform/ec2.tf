data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = aws_key_pair.generated_key.key_name

  user_data = <<-EOF
              #!/bin/bash
              dnf update -y
              dnf install -y docker
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ec2-user

              # Run the Book Exchange container
              docker run -d \
                --name book_exchange_app \
                --restart unless-stopped \
                -p 3000:3000 \
                -e PORT=3000 \
                -e ENABLE_SQLITE_FALLBACK=true \
                ghcr.io/ram55o/book-exchange:latest
              EOF

  tags = {
    Name = "book-exchange-ec2"
  }
}
