function (httpRequestLib, Q, db) {
    var exports = {};
    
    const urlBase = 'http://www.mapquestapi.com/geocoding/v1/address?key=[INSERT API KEY HERE!!!]&location=';
    
    const callApi = function(addressObj) {
        var deferred = Q.defer();
        
        var addy = addressObj.address || '';
        
        if(addy) addy += ',';
        
        if(addressObj.city) {
            addy += addressObj.city + ' ';
        }
        if(addressObj.state) {
            addy += addressObj.state;
        }
        if(addressObj.zip) {
            if(addy) addy += ',';
            addy += addressObj.zip;
        }
        
        console.log('Attempting address: %s', addy);
        
        if(!addy) {
            return Q(null);
        }
        
        httpRequestLib( {
            uri:urlBase+addy,
            json:true
        }, function(err, httpResponse, body) {
            body = body || {};
            if(err) {
                deferred.reject(err);
            }
            else {
                console.log(body);
                console.log(httpResponse);
                var result = body && body.results && body.results[0]; 
                var loc = result && result.locations && result.locations[0];
                
                if(loc && loc.latLng) {
                    deferred.resolve(loc.latLng);
                }
                else {
                    console.error('BAD RESPONSE FROM MAPQUEST %j', body);
                    deferred.reject('BAD RESPONSE');
                }
            }
            
        });//end httpRequest.post
        
        return deferred.promise;
    };
    
    exports.translateCityState = function(city, state) {
         
        var queryObj = {
            city, state
        };
        
        return db.GeocodeCache.findOne(queryObj).then(function(bo) {
            if(bo) {
                return bo.latlng;
            }
            
            return callApi(queryObj).then(function(loc) {
                var newBo = new db.GeocodeCache(queryObj);
                newBo.latlng = loc;
                
                return newBo.save().then(()=>{return loc;});
            });
        });
        
    };
    
    exports.translateAddress = function(addressObj) {
        
        if(addressObj.address) {
            //Skip cache for specific address
            return callApi(addressObj);
        }
        var queryObj;
        
        if(addressObj.zip) {
            queryObj = {zip:addressObj.zip}
        }
        else {
            queryObj = addressObj;
        }
        
        return db.GeocodeCache.findOne(queryObj).then(function(bo) {
            if(bo) {
                return bo.latlng;
            }
            
            
            return callApi(queryObj).then(function(loc) {
                var newBo = new db.GeocodeCache(queryObj);
                newBo.latlng = loc;
                
                return newBo.save().then(()=>{return loc;});
            });
        });
        
    };
    
    
    return exports;
}