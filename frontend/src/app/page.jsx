"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email === "user@gmail.com" && password === "user") {
      router.push("/dashboard");
    } else {
      setError("Incorrect username or password.");
    }
  };

  return (
    <main className='min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-200 via-teal-100 via-20% to-transparent'>
      <Card className='flex flex-col justify-center mx-auto p-8 min-h-[450px] max-w-[90%] shadow-md rounded-md bg-gradient-to-br from-teal-50 to-white'>
        <CardHeader className='mb-2 flex flex-col justify-center items-center'>
          <Image
            src='/lakbai-logo.png'
            alt='LakbAI Logo'
            width={50}
            height={50}
          />
          <CardTitle className='text-2xl font-bold text-center'>
            LakbAI Analytics
          </CardTitle>
          <CardDescription className='text-xs text-gray-500 text-center'>
            A data-driven and AI-powered bus analysis software for Metro Manila
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='user@gmail.com'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  className='h-10'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id='password'
                  type='password'
                  required
                />
              </div>
              <div className='text-xs text-red-500 h-2'>{error}</div>
              <Button
                type='submit'
                className='w-full rounded-md text-white bg-gradient-to-r from-teal-800 to-cyan-500 hover:shadow-sm'
              >
                Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
