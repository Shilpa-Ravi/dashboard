'use strict';

app.controller('dataController',
      function($scope,
       $rootScope,
       $location,
       $stateParams,
       $q,
       utilityService,
       tableTypeService,
       columnDataTypeService,
       tableErrorService,
       projectService,
       tableService,
       $timeout,
       $state) {
      
        var id;
        var tableId;
        $scope.newtables=[];
        $scope.addTablePopup=false;    
        
        $scope.initialize = function() {
            $rootScope.page='tableDesigner';
            $rootScope.dataLoading=true;                                 
            $scope.colDataTypes=columnDataTypeService.getcolumnDataTypes();       
            id = $stateParams.appId;
            tableId= $stateParams.tableId;               

            if($rootScope.currentProject && $rootScope.currentProject.appId === id){
              //if the same project is already in the rootScope, then dont load it. 
              getProjectTables();              
            }else{
              loadProject(id);              
            }            

        };
       
        $scope.deleteTableModal=function(t){
          $scope.selectedTable = t;
          $scope.confirmTableName=null;
          $('#md-deleteTable').modal('show');
        }

        $scope.deleteTable = function(t) {
           if ($scope.confirmTableName === null) {

              $scope.confirmTableName=null; 
              $('#md-deleteTable').modal("hide");
              $.gritter.add({
                  position: 'top-right',
                  title: 'Warning',
                  text: 'Table name you entered was empty.',
                  class_name: 'prusia'
              }); 
                        
            } else if($scope.confirmTableName === t.name){            

              tableService.deleteTable($rootScope.currentProject.appId, t)             
              .then(function(tables){        
                  if($scope.selectedTable == t)
                  $scope.selectedTable = undefined;
                  
                  var i = $rootScope.currentProject.tables.indexOf(t);
                  $rootScope.currentProject.tables.splice(i, 1);                             

                  $('#md-deleteTable').modal("hide");               
                  $scope.confirmTableName=null;                                
              },
              function(error){ 
                   $.gritter.add({
                      position: 'top-right',
                      title: 'Oops!',
                      text: 'We cannot delete table right now',
                      class_name: 'danger'
                  });              
              });              

            }else{  
                $scope.confirmTableName=null;
                $('#md-deleteTable').modal("hide");               
                $.gritter.add({
                    position: 'top-right',
                    title: 'Warning',
                    text: 'Table name doesnot match.',
                    class_name: 'prusia'
                });         
            }        
                        
        };


        $scope.checkMaxCount=function(tableType){
            //this is a filter.
            var count = 0;

            for(var i=0;i<$rootScope.currentProject.tables.length; i++){
                if($rootScope.currentProject.tables[i].type.type === tableType.type){
                  count++;
                }
            }

            if(count < tableType.maxCount){
              return tableType;
            }

            return null;
        };

        $scope.initiateTableSettings=function(){
            $scope.tableTypes = tableTypeService.getTableTypes();
            $scope.newTableType = "custom";
            $scope.selectedTableType=_.first(_.where($scope.tableTypes, {type:'custom'}));
            $scope.tableError=null;

            var tableName="Custom";
            var incrementor=0;
            (function iterator(i) {
                    $scope.checkErrorsForCreate(tableName,$rootScope.currentProject.tables,"table");
                    if($scope.tableErrorForCreate){
                        ++incrementor;
                        tableName="Custom"+incrementor;
                        iterator(i+1);
                    }
            })(0);
            $scope.newTableName = tableName;
            $scope.addTablePopup=true;
        };

      $scope.cancelAddtable=function(){
        $scope.addTablePopup=false;
      };

      $scope.selectType=function(newTableType){
        $scope.selectedTableType=_.first(_.where($scope.tableTypes, {type:newTableType}));
        $scope.newTableName = angular.copy($scope.selectedTableType.name);
      };

      $scope.addNewTable = function() {
        var tableTypeObj=_.first(_.where($scope.tableTypes, {type:$scope.newTableType}));
        getRelatedTables(tableTypeObj);
        $scope.addTablePopup=false; 

        $scope.saveTables($scope.newtables)
        .then(function(tables){        
            $scope.newtables=[];
            $scope.newTableName = '';                           
        },
        function(error){ 
          for(var i=0;i<$scope.newtables.length;++i){           
            var removableTable=_.first(_.where($rootScope.currentProject.tables, {id:$scope.newtables[i].id}));
            var index=$rootScope.currentProject.tables.indexOf(removableTable);
            $rootScope.currentProject.tables.splice(index,1);
          }
          $scope.newtables=[];
          $scope.newTableName = ''; 

        });               
      };      
      

      function getRelatedTables(table){  

            for(var i=0;i<table.columns.length;++i){
              if(table.columns[i].relatedToType){
                var relatedToTypeObj=_.first(_.where($scope.tableTypes, {type:table.columns[i].relatedToType})); 
                getRelatedTables(relatedToTypeObj);
              }      
            }

            var tableName;
            var alreadyExist;
            if(table.isRenamable){
                  tableName=$scope.newTableName;
                  alreadyExist=_.first(_.where($rootScope.currentProject.tables, {name:tableName}));
            }else{
                  tableName=table.name;
                  alreadyExist=_.first(_.where($rootScope.currentProject.tables, {name:table.name}));
            } 
            
             //creating table             
              if(!alreadyExist){

                  for(var i=0;i<table.columns.length;++i){
                      if(table.columns[i].relatedToType){
                        var getTable=_.first(_.where($scope.tableTypes, {type:table.columns[i].relatedToType})); 
                        var relTable=_.first(_.where($rootScope.currentProject.tables, {name:getTable.name})); 
                        table.columns[i].relatedTo=relTable.name;                       
                      }      
                  }
                  
                  var columnArray=angular.copy(table.columns);
                  var uniqueId=utilityService.makeId();
                  var t = {
                             id: uniqueId,
                           name: tableName,
                           type: table,
                        columns: columnArray,
                     tableColor: randomColor({
                                   luminosity: 'bright'
                                 })
                    };                   
                  
                    $scope.newtables.push(t);
                    $rootScope.currentProject.tables.push(t);                    

                    if($rootScope.currentProject.tables.length==1){
                        $.gritter.add({
                          position: 'top-right',
                          title: 'Great!',
                          text: 'Your first table is created. See our docs to build apps.',
                          class_name: 'success'
                        });
                    }                                            
                           
              }
          //End of creating table  
            
        } 

      //Table Errors
      $scope.checkErrorsForCreate=function(name,arrayList,type){
        var result=tableErrorService.checkErrorsForCreate(name,arrayList,type);
        if(result){
              if(type=="table"){
                  $scope.tableErrorForCreate=result;
              }
              if(type=="column"){
                $scope.columnErrorForCreate=result;
              }

        }else{
          $scope.tableErrorForCreate=null;
          $scope.columnErrorForCreate=null;
        }

      }

           
        //Saving Array of Tables
        $scope.saveTables=function(tables){
          var q=$q.defer();

          $scope.showSaveBtn=false;

          var promises = [];

          if(tables.length>0){
              promises.push(tableService.saveTables($rootScope.currentProject.appId, tables));
          }        

          $q.all(promises)
          .then(function(tables){
              q.resolve(tables);              
           },
           function(error){
              $.gritter.add({
                  position: 'top-right',
                  title: 'Opps! something went wrong',
                  text: "We're sorry, We cant save your tables at this point in time. Please try again later.",
                  class_name: 'danger'
              });
              q.reject(error);
           });

           return  q.promise;
        };
        
        $scope.filterDataType=function(dataTypeObj){
          if(dataTypeObj.type!="List" && dataTypeObj.type!="Relation"){
            return dataTypeObj;
          }
        };        
            
        /* PRIVATE FUNCTIONS */

        function loadProject(id){

            projectService.getProject(id).then(
             function(currentProject){
                  if(currentProject){
                    $rootScope.currentProject=currentProject;
                    getProjectTables();
                  }                              
             },
             function(error){                 
                $.gritter.add({
                    position: 'top-right',
                    title: 'Opps! something went wrong',
                    text: "We cannot load your project at this point in time. Please try again later.",
                    class_name: 'danger'
                });
             });
        }

        function getProjectTables(){

           tableService.getProjectTables($rootScope.currentProject)
                .then(function(data){
                    $rootScope.dataLoading=false;

                    if(!data){                    
                      $rootScope.currentProject.tables=[];                       
                    }     
                    else if(data){                        
                        $rootScope.currentProject.tables=data;
                 
                    }         
                   
                }, function(error){ 
                    $rootScope.dataLoading=false;                         
                    $.gritter.add({
                      position: 'top-right',
                      title: 'Opps! something went wrong',
                      text: "We cannot load your tables at this point in time. Please try again later.",
                      class_name: 'danger'
                    });
                });
        }     
      

});
