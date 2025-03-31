# Visualize Teraslice Pipelines and Jobs in 3D

## Description

This web app allows you to visualize the relationships between your Teraslice
Jobs.  I think of these in terms of pipelines, where one job may write into a
Kafka topic that is in turn read by another downstream job and so on, until one
or more terminal jobs write the final data into an OpenSearch (or ElasticSearch)
cluster.

## Development

```bash
TERASLICE_URL="http://teraslice.example.com" uv run fastapi dev
```

### Docker

```bash
docker build -t teraslice-3d .
docker run -e TERASLICE_URL="http://teraslice.example.com" -p 8000:80 teraslice-3d
```
