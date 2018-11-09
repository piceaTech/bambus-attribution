import {Model} from 'sequelize-typescript';
import { Context } from 'koa';

import Bambus, {Controller, JSONAPIController} from '@bambus/main'


const debug = require('debug')('bambus:plugin:attribution');

const createdBySymbol = Symbol('createdBy');
const updatedBySymbol = Symbol('updatedBy');


interface AttributionModel<T extends Model<T>> extends Model<T>{
  [createdBySymbol]?: string;
  [updatedBySymbol]?: string;
}


export function CreatedBy<T extends Model<T>> (target: AttributionModel<T>, propertyKey: string): any { // this is the decorator
  // only set up because we don't know who is gonna make the change
  target[createdBySymbol] = propertyKey
}

export function UpdatedBy<T extends Model<T>> (target: AttributionModel<T>, propertyKey: string): any { // this is the decorator
  // set up which property should be updated when updating
  target[updatedBySymbol] = propertyKey   
}

export default function(bambus: Bambus){
  for(let controller in bambus.controllers){
    let currentController = bambus.controllers[controller];

    if(!(currentController instanceof JSONAPIController)){
       debug(`${controller}Controller is not a JSONAPIController therefore no attribution is used on it.`)
       continue;
    }
    debug(`${controller}Controller is a JSONAPIController therefore attribution is used on it.`)
    
    if(currentController.modelClass.prototype[createdBySymbol]){
      //create post
      currentController.router.post('set CreatedBy', '/', setCreatedBy(currentController.modelClass.prototype[createdBySymbol]));
    }

    if(currentController.modelClass.prototype[updatedBySymbol]){
      currentController.router.post('set UpdatedBy', '/', setUpdatedBy(currentController.modelClass.prototype[updatedBySymbol]));
      currentController.router.patch('set updatedBy', '/:id', setUpdatedBy(currentController.modelClass.prototype[updatedBySymbol]));
      
    }
  }
}


function setUpdatedBy(property : string){
  return function(ctx: Context, next: Function){
    if(!ctx.state.user){
      throw new Error('User is not authenticated.')
    }
    if(typeof ctx.request.body === 'object'){
      (<any>ctx.request.body)[property] = ctx.state.user.id
    }
    return next();
  }
}

function setCreatedBy(property: string){
  return function(ctx: Context, next: Function){
    if(!ctx.state.user){
      throw new Error('User is not authenticated.')
    }
    if(typeof ctx.request.body === 'object'){
      (<any>ctx.request.body)[property] = ctx.state.user.id
    }
    return next();
  }
}
