import React from 'react';
import logo from './logo.svg';
import './App.css';
import { useState, useRef, useEffect } from "react";
import { Grid, Box, Typography, TextField, Button, CircularProgress, Stack, IconButton } from '@mui/material';
// import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {socket} from './socket';

type shootingStar = {
  x : number;
  y : number;
  v_x : number;
  v_y : number;
  isSStar : boolean;
  t: number;
}

type star = {
  x : number;
  y : number;
  isSStar : boolean;
}

type edge = {
  start : number;
  end : number;
}

function newEdge() {
  return {
    start: -1,
    end: -1,
  }
}

function newSStar() {
  return {
    x: 1,
    y: 2,
    v_x: 3,
    v_y: 4,
    isSStar: true,
    t: -1
  }
}

function newStar() {
  return {
    x: 1,
    y: 2,
    isSStar: false
  }
}
var tickIters = 0;

const server_url = "https://unusual-vickie-prj-trex-e25f682f.koyeb.app"
const quotes = ["hi", "second quote", "third quote"]

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height
  };
}

function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}


function App() {
  const shootingStarTick : number = 10;
  const generateShootingStarDelay : number = 500;
  const numberOfStars : number = 150;
  const sStarMaxVelocity = 50;
  const distanceThreshold = 10**2;

  const dimensions = useWindowDimensions();
  const pageHeight = dimensions.height
  const pageWidth = dimensions.width;

  const [ stars, setStars ] = useState<star[]>([])
  const [ shootingStars, setShootingStars ] = useState<shootingStar[]>([getNewSStar()])
  const [ shootingStarTimes, setShootingStarTimes ] = useState<number[]>([])
  const [ selectedStar, setSelectedStar ] = useState(-1);
  const [ edges, setEdges ] = useState<edge[]>([]);
  const [ isDrawMode, setIsDrawMode ] = useState(false);
  const [ isDrag, setIsDrag ] = useState(false);
  const [ quoteNum, setQuoteNum ] = useState(0);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const drawToggleButtonRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let sstar_func = (e: any) => {
      setShootingStars([...shootingStars, parseSStar(e)])
    }
    socket.on("sstar", sstar_func)

    socket.on("connect_error", (err: any) => {
      // the reason of the error, for example "xhr poll error"
      console.log(err.message);
      
      console.log(err)

      // some additional description, for example the status code of the initial HTTP response
      console.log(err.description);
    
      // some additional context, for example the XMLHttpRequest object
      console.log(err.context);
    });
    // socket.on("error", (err) => {
    //   console.log(err)
    // })); - 'npm ci --cache .npm --prefer-offline'

    // socket.emit("lol", "lol")
    return () => {
      socket.off('sstar', sstar_func)
    }
  }, [shootingStars])

  useEffect(() => {
    let stars_func = (e: any) => {
      setStars(parseServerStars(e))
    }
    socket.on("stars", stars_func);
    // socket.emit("lol", "lol")
    return () => {
      socket.off('stars', stars_func)
    }
  }, [stars])

  useEffect(() => {
    let star_func = (e: string) => {
      console.log("getting new star")
      let star_str: string = e.substring(1, e.length - 1)
      console.log(parseStar(star_str))
      setStars([...stars, parseStar(star_str)])
    }
    socket.on("star", star_func)
    // socket.emit("lol", "lol")
    return () => {
      socket.off('star', star_func)
    }
  }, [stars])

  useEffect(() => {
    let edge_func = (e: any) => {
      setEdges([...edges, parseEdge(e)])
    }
    
    socket.on("edge", edge_func)
    // socket.emit("lol", "lol")
    return () => {
      socket.off('edge', edge_func)

    }
  }, [edges])

  useEffect(() => {
    // console.log("adding effect")
    let listener = (e: any) => {
      console.log(e.key);
      if (e.key === 'r') {
        fetch(server_url + "/refresh", {
          method: "GET",
          headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
        }).then(async (res) => {
          if (res.status == 200) {
            setEdges([])
            // let data = await res.json()
            // setStars(parseServerStars(data.data))
          }
        })
      }
      if (e.key == 's') {
        fetch(server_url + "/get/sstar", {
          method: "GET",
          headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
        }).then(async (res) => {
          if (res.status == 200) {
            // let data = await res.json()
            // let sstar = parseSStar(data.data)
            // setShootingStars([...shootingStars, sstar])
          }
        })
      }
    }
    document.addEventListener('keyup', listener);
    return () => {
      document.removeEventListener('keyup', listener)
    }
  }, [])

  useEffect(() => {
    const starInterval = setInterval(() => {
      if (shootingStars.length > 0)
        updateShootingStars();
    }, shootingStarTick);

    return () => {
      clearInterval(starInterval);
    }
  }, [shootingStars]);

  function parseEdge(raw_edge: string) {
    let edge = newEdge();
    for (let i = 0; i < raw_edge.length; i++ ){
      if (raw_edge[i] === ',') {
        edge.start = parseInt(raw_edge.substring(0, i))
        edge.end = parseInt(raw_edge.substring(i + 1))
        break
      }
    }
    return edge
  }

  function parseSStar(sstar: string) {
    let vals = [];
    let prev = -1;
    for (let i = 0; i < sstar.length + 1; i++) {
      if (sstar[i] == ',' || i === sstar.length) {
        vals.push(parseFloat(sstar.substring(prev, i)));
        prev = i + 1;
      }
    }
    let res = newSStar();
    
    res.x = vals[0]
    res.y = vals[1]
    res.v_x = vals[2]
    res.v_y = vals[3]
    return res
  }

  function parseStar(star: string) {
    let res = newStar();
    for (let i = 0; i < star.length; i++){
      if (star[i] == ',') {
        res.x = parseFloat(star.substring(0, i));
        res.y = parseFloat(star.substring(i + 1));
      }
    }
    return res;
  }

  function parseServerStars(stars: string) {
    console.log(stars.length)
    let star_arr: star[] = []
    for (let i = 0; i < stars.length; i++ ){ 
      if (stars[i] === "(") {
        let j = i;
        while (j < stars.length && stars[j] != ")") j++;
        let star = stars.substring(i + 1, j);
        star_arr.push(parseStar(star))
        i = j;
      }
    }
    return star_arr
  }

  function getNewSStar() {
    let sstar : shootingStar = newSStar();
    if (Math.random() > 0.5) {
      sstar.x = Math.round(Math.random())*100;
      sstar.y = Math.random()*100;
    }
    else {
      sstar.y = Math.round(Math.random())*100;
      sstar.x = Math.random();
    }
    sstar.v_x = (Math.random() - 0.5)*2*sStarMaxVelocity;
    sstar.v_y = Math.sqrt(sStarMaxVelocity**2 - sstar.v_x**2) * (Math.random() > 0.5 ? -1 : 1);
    return sstar;
  }

  function updateShootingStars() {
    let updatedStars : shootingStar[] = [];
    for (let i = 0; i < shootingStars.length; i++) {
      let sstar : shootingStar = shootingStars[i];
      sstar.x += sstar.v_x * shootingStarTick/1000;
      sstar.y += sstar.v_y * shootingStarTick/1000;
      if (sstar.x < 0 || sstar.x > 100 || sstar.y < 0 || sstar.y > 100) {
        continue;
      }
      updatedStars.push(sstar);
    }
    
    setShootingStars(updatedStars);
  }

  function renderStar(x : number, y : number, isSStar : boolean, starInd: number) {
    return <Box sx={{position: "absolute", marginLeft: (x + "vw"), marginTop: (y + "vh"), color: "white", fontSize: (isSStar ? 10 : 5)}}
      onClick={() => {
        if (!isSStar) {
          console.log("clicked on star")
          if (selectedStar == -1) {
            setSelectedStar(starInd);
          }
          else {
            let edge = newEdge();
            edge.start = selectedStar;
            edge.end = starInd;
            fetch(server_url + "/add-edge", {
              method: "POST",
              body: JSON.stringify(edge),
              headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
            }).then((res) => {

            });
            // setEdges([...edges, edge])
            setSelectedStar(-1)
          }
        }
      }}>
      <p>*</p>
    </Box>;
  }

  function renderStars() {
    return [...stars, ...shootingStars].map((star, ind) => {
      // if (star.isSStar) {
      //   let t = 
      // }
      return renderStar(star.x, star.y, star.isSStar, ind);
    })
    
  }

  // function generateTrail() {

  // }

  // function renderShootingStar(star : shootingStar) {

  // }

  function renderEdge(e: edge) {
    let s1: star = stars[e.start];
    let s2: star = stars[e.end];
    const box1 = getBoxCenter(s1.x, s1.y)
    const box2 = getBoxCenter(s2.x, s2.y)
    let correctionFactor = 0
    if (drawToggleButtonRef.current) {
      correctionFactor = drawToggleButtonRef.current.clientHeight/pageHeight*100
    }
    

    return <svg style={{position: "absolute"}} width="100vh" height="100vh">
        <line x1={box1.x} y1={box1.y + correctionFactor} x2={box2.x} y2={box2.y + correctionFactor} stroke="white"/>
      </svg>
  }

  function renderEdges() {
    return edges.map((edge, ind) => {
      return renderEdge(edge)
    })
  }

  function drag(e: any) {
    if (isDrag && isDrawMode) {
      console.log("sending")
      let star = newStar();
      star.x = e.pageX/pageWidth*100;
      star.y = e.pageY/pageHeight*100;
      if (drawToggleButtonRef.current) {
        star.y -= drawToggleButtonRef.current.clientHeight/pageHeight*100
      }
      fetch(server_url + "/add-star", {
        method: "POST",
        body: JSON.stringify({
          x: star.x,
          y: star.y
        }),
        headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
      })
      
      // setStars([...stars, star])
    }
  }

  function startDrag(e: any) {
    setIsDrag(true);
  }

  function endDrag(e: any) {
    setIsDrag(false)
  }

  const vwToPx = (value: number) => (value * pageWidth) / 100;
  const vhToPx = (value: number) => (value * pageHeight) / 100;

  const getBoxCenter = (marginLeftVw: number, marginTopVh: number) => {
    const left = vwToPx(marginLeftVw);
    const top = vhToPx(marginTopVh);
    const width = 2.6; // Box width in pixels
    const height = 6; // Box height in pixels
    return {
      x: left + width / 2,
      y: top + height / 2,
    };
  };

  return (
   <Box onMouseDown={startDrag}
        onMouseMove={drag}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        >
      
      <Grid container direction="column" ref={drawToggleButtonRef}>
        <Grid item xs={1}>
          <Button sx={{color: "white"}} onClick={() => {setIsDrawMode(!isDrawMode)}}>{(isDrawMode ? "Turn draw mode off" : "Turn draw mode on")}</Button>
        </Grid>
      </Grid>

      <Box 
        minWidth="100vw" minHeight="100vh">
      {renderEdges()}
      {renderStars()}
      </Box>
      
      
      <Grid container minHeight="100vh" direction="row" alignContent="start">
        <Grid item xs={1}>
          <Button sx={{color: "white"}} onClick={() => {setQuoteNum((quoteNum == 0 ? quotes.length - 1 : quoteNum - 1))}}>{"<-"}</Button>
        </Grid>
        <Grid item xs={10} justifyContent="center" justifyItems="center">
          <Typography color="white" textAlign="center" onClick={() => {console.log(edges)}}>{quotes[quoteNum]}</Typography>
        </Grid>
        <Grid item xs={1}>
          <Button sx={{color: "white"}} onClick={() => {setQuoteNum((quoteNum == quotes.length - 1 ? 0 : quoteNum + 1))}}>{"->"}</Button>
        </Grid>
      </Grid>
   </Box>
  );
}

export default App;
