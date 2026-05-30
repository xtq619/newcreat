FROM python:3.11-slim

WORKDIR /app

# 使用国内 PyPI 镜像
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip install --no-cache-dir uv

COPY pyproject.toml .
RUN uv pip install --system --index-url https://pypi.tuna.tsinghua.edu.cn/simple .

COPY . .

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
