var loopback = require('loopback');
const fs = require('fs');

var OUT_FILE = "db-2-jdl.jdl";

var ds = loopback.createDataSource('oracle', {
  "host": "localhost",
  "port": 1521,
  "database": "HR",
  "username": "scott",
  "password": "tiger"
});

fs.access( OUT_FILE, fs.constants.R_OK | fs.constants.W_OK, (err) => {
  if (!err) {
    fs.unlinkSync(OUT_FILE,(err) => {
      if (err) throw err;
    });
  }
});

ds.discoverModelDefinitions({views: false, limit: 50}, 
  function (err, models) {
    models.forEach(processModel);
  }
);

function processModel(item, index) {

  var itemName = item.name;
  ds.discoverSchema(itemName, function (err, schema) {
    fs.appendFileSync(OUT_FILE, "\nentity " + schema.name + " { \n\n" );
    for (var column in schema.properties) {
      if (schema.properties.hasOwnProperty(column)) {
        fs.appendFileSync(OUT_FILE, "\t");
        fs.appendFileSync(OUT_FILE, column);
        fs.appendFileSync(OUT_FILE, " ");
        switch(schema.properties[column].type){

          case "String":
            fs.appendFileSync(OUT_FILE, "String maxlength(");
            fs.appendFileSync(OUT_FILE, schema.properties[column].oracle.dataLength);
            fs.appendFileSync(OUT_FILE, ")");
            if( schema.properties[column].required ){
              fs.appendFileSync(OUT_FILE, " required");
            }
            break;

          case "Date":
            fs.appendFileSync(OUT_FILE, "LocalDate");

            if( schema.properties[column].required ){
              fs.appendFileSync(OUT_FILE, " required");
            }
            break;

          case "Number":


            var length = schema.properties[column].oracle.dataLength;
            var precision = schema.properties[column].oracle.dataPrecision;
            var scale = schema.properties[column].oracle.dataScale;
            if( scale === null | scale === 0 ){

              if( precision === null | precision === 0 ){
                
                if(length === 1){
                  fs.appendFileSync(OUT_FILE, " Boolean");
                }
                /*
                if( length > 1 & length <= 3 ){
                  fs.appendFileSync(OUT_FILE, " Byte");
                }
                */
                if( length > 1 & length <= 5 ){
                  fs.appendFileSync(OUT_FILE, " Short");
                }
                if( length > 5 & length <= 10 ){
                  fs.appendFileSync(OUT_FILE, " Integer");
                }
                if( length > 10 ){
                  fs.appendFileSync(OUT_FILE, " Long");
                }

              }else{

                switch( precision ){

                  case 1:
                    fs.appendFileSync(OUT_FILE, " Boolean");
                    break;
                  case 2:
                  case 3:
                    fs.appendFileSync(OUT_FILE, " Byte");
                    break;
                  case 4:
                  case 5:
                    fs.appendFileSync(OUT_FILE, " Short");
                    break;
                  case 6:
                  case 7:
                  case 8:
                  case 9:
                  case 10:
                    fs.appendFileSync(OUT_FILE, " Integer");
                    break;
                  default:
                    //console.log("Precision: " + precision + " field: " + column);
                    fs.appendFileSync(OUT_FILE, " Long");
                }

              }           

            }else{
              fs.appendFileSync(OUT_FILE, " BigDecimal");
            }

            if( schema.properties[column].required ){
              fs.appendFileSync(OUT_FILE, " required");
            }
            break;
        }

      }
      fs.appendFileSync(OUT_FILE, "\n");
    }


    fs.appendFileSync(OUT_FILE, "\n}, \n");

    processRelationShips(itemName);
  });
}

function processRelationShips(tableName, modelName){

ds.discoverAndBuildModels(tableName, {visited: {}, associations: true},

  function (err, models) {
    for ( var m in  models){
        
        if (!models.hasOwnProperty(m)) continue;

        var obj = models[m];    

        if(obj.relations){
          for ( var r in  obj.relations){
        
              if (!obj.relations.hasOwnProperty(r)) continue;

              var relobj =  obj.relations[r];
              var relstr = "OneToOne";
              switch(relobj.type){

                case "belongsTo":
                  relstr = "OneToMany";
                  break; 

                default:
                  relstr = "Unknown";

              }


              fs.appendFileSync(OUT_FILE, "relationship " + relstr + " { " + m + "(" + relobj.keyFrom + ") to " + relobj.modelTo.definition.name + "(" + relobj.keyTo + ")" + " },\n" );
          }
        }
    }
  }
);

}

console.log("File db-2-jdl.jdl generated");
