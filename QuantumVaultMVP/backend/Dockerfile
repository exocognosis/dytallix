FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates git
COPY go.mod ./
# go.sum may not exist yet; docker build will generate it.
COPY go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /out/qv-api ./cmd/api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/qv-api /app/qv-api
COPY migrations /app/migrations
EXPOSE 8080
ENTRYPOINT ["/app/qv-api"]
