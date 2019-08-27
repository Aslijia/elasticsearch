# elasticsearch

log4js component for elasticsearch


### Usage

    /// configure log4js
    {
        "appenders":{
            "elastic":{
                "type": "@aslijia/elasticsearch",
                "host": "http://localhost:9200"
            }
        },
        "categories":{
            "default": {
                "appenders": ["elastic"],
                "level": "ALL"
            }
        }
    }