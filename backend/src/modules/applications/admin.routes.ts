// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { authenticate, currentUserId, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

export const portalAdminRouter = Router();
portalAdminRouter.use(authenticate, requireRole("ADMINISTRATOR"));
portalAdminRouter.put("/countries/:code", validate(z.object({ name:z.string().min(2).max(100), languages:z.array(z.string().max(30)).max(10), privacyNoticeUrl:z.string().url().optional(), storageRegion:z.string().max(80).optional(), requirements:z.record(z.unknown()).default({}) })), asyncHandler(async(req,res)=>{
 const code=req.params.code.toUpperCase(); if(!/^[A-Z]{2}$/.test(code)) throw AppError.badRequest("Country code must be ISO alpha-2");
 const data=await prisma.countryConfiguration.upsert({where:{code},create:{code,...req.body},update:req.body}); res.json({data});
}));
portalAdminRouter.post("/opportunities/:id/requirements", validate(z.object({version:z.number().int().positive(),key:z.string().min(1).max(100),description:z.string().min(1).max(500),kind:z.enum(["country","skill","education","experience","document","declaration"]),mandatory:z.boolean(),minimumCount:z.number().int().min(1).max(20).default(1),acceptedEvidence:z.array(z.string()).default([]),sourceUrl:z.string().url(),country:z.string().length(2).optional(),effectiveFrom:z.coerce.date().optional(),effectiveUntil:z.coerce.date().optional()})), asyncHandler(async(req,res)=>{
 const opp=await prisma.opportunity.findUnique({where:{id:req.params.id}});if(!opp)throw AppError.notFound("Opportunity not found");
 const data=await prisma.opportunityRequirement.upsert({where:{opportunityId_version_key:{opportunityId:opp.id,version:req.body.version,key:req.body.key}},create:{opportunityId:opp.id,...req.body},update:req.body});res.status(201).json({data});
}));
portalAdminRouter.post("/connectors", validate(z.object({name:z.string().min(2).max(120),country:z.string().length(2),kind:z.enum(["recruitment","scholarship","training","grant"]),endpoint:z.string().url(),authorizationReference:z.string().max(200).optional()})), asyncHandler(async(req,res)=>{
 const url=new URL(req.body.endpoint); if(url.protocol!=="https:")throw AppError.badRequest("Connector endpoints must use HTTPS");
 // Staged disabled. Enabling a connector requires separately reviewed credentials and partner authorization.
 const data=await prisma.institutionConnector.create({data:{...req.body,enabled:false}});res.status(201).json({data});
}));
portalAdminRouter.get("/connectors",asyncHandler(async(_req,res)=>{res.json({data:await prisma.institutionConnector.findMany({select:{id:true,name:true,country:true,kind:true,endpoint:true,enabled:true,createdAt:true}})});}));
portalAdminRouter.patch("/documents/:id/verification", validate(z.object({status:z.enum(["VERIFIED","REJECTED"]),reason:z.string().max(1000).optional()})),asyncHandler(async(req,res)=>{
 const userId=currentUserId(req);const doc=await prisma.applicantDocument.findUnique({where:{id:req.params.id}});if(!doc||doc.deletedAt)throw AppError.notFound("Document not found");
 const result=await prisma.$transaction(async tx=>{const updated=await tx.applicantDocument.update({where:{id:doc.id},data:{status:req.body.status}});await tx.documentVerification.create({data:{documentId:doc.id,reviewerId:userId,status:req.body.status,reason:req.body.reason}});return updated;});res.json({data:{id:result.id,status:result.status}});
}));
