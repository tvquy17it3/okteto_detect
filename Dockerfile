FROM python:3.7

COPY bashrc /root/.bashrc
WORKDIR /usr/src/app

COPY requirements.txt requirements.txt
ADD app.py /app.py
ADD okteto-stack.yaml /okteto-stack.yaml
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
COPY app.py app.py
COPY ./align align
COPY ./facenet facenet
COPY ./models models

EXPOSE 5000
CMD ["python3", "app.py"]
