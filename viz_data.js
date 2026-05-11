const PILLARS = [
  {id:"backprop",abbr:"BACK",title:"Learning representations by back-propagating errors",year:1986,direct_cites:30451,ris_score:22679,collapse_percent:78,
   quote:"If you remove this 1986 paper, modern neural networks lose their mathematical foundation. Almost every major AI model today relies on this.",
   domain_capture:{Transformers:82,CNNs:91,RNNs:95,RL:70,NLP:88},
   gremlin_query:"g.V().has('Paper','title','backprop')\n  .repeat(inE('CITES').outV())\n  .times(2).emit().dedup().count()"},
  {id:"lstm",abbr:"LSTM",title:"Long short-term memory",year:1997,direct_cites:96561,ris_score:29063,collapse_percent:63,
   quote:"Before transformers, memory meant LSTMs. Wipe this 1997 paper and early translation engines and voice assistants break.",
   domain_capture:{Transformers:71,CNNs:22,RNNs:97,RL:45,NLP:82},
   gremlin_query:"g.V().has('Paper','title','lstm')\n  .repeat(inE('CITES').outV())\n  .times(2).emit().dedup().count()"},
  {id:"attention",abbr:"ATTN",title:"Neural machine translation by jointly learning to align and translate",year:2014,direct_cites:14596,ris_score:20162,collapse_percent:71,
   quote:"This 2014 paper gave neural networks the ability to focus. No attention means no transformers and no large language models.",
   domain_capture:{Transformers:94,CNNs:18,RNNs:68,RL:30,NLP:91},
   gremlin_query:"g.V().has('Paper','title','attention')\n  .repeat(inE('CITES').outV())\n  .times(2).emit().dedup().count()"},
  {id:"cnn",abbr:"CNN",title:"Backpropagation applied to handwritten zip code recognition",year:1989,direct_cites:11800,ris_score:23997,collapse_percent:57,
   quote:"The paper that taught computers to see. Without it, modern computer vision including self-driving perception and medical imaging disappears.",
   domain_capture:{Transformers:24,CNNs:96,RNNs:10,RL:28,NLP:15},
   gremlin_query:"g.V().has('Paper','title','cnn')\n  .repeat(inE('CITES').outV())\n  .times(2).emit().dedup().count()"},
  {id:"dropout",abbr:"DROP",title:"Dropout: a simple way to prevent neural networks from overfitting",year:2014,direct_cites:34246,ris_score:22123,collapse_percent:49,
   quote:"A simple idea: turn off random neurons during training. Without Dropout, deep learning models overfit and fail to generalize in production.",
   domain_capture:{Transformers:65,CNNs:78,RNNs:60,RL:55,NLP:70},
   gremlin_query:"g.V().has('Paper','title','dropout')\n  .repeat(inE('CITES').outV())\n  .times(2).emit().dedup().count()"},
  {id:"word2vec",abbr:"W2V",title:"Efficient estimation of word representations in vector space",year:2013,direct_cites:18114,ris_score:20322,collapse_percent:44,
   quote:"In 2013 words became points in space. Without this, there are no embeddings, no vector databases, and no semantic search.",
   domain_capture:{Transformers:74,CNNs:12,RNNs:48,RL:20,NLP:93},
   gremlin_query:"g.V().has('Paper','title','word2vec')\n  .repeat(inE('CITES').outV())\n  .times(2).emit().dedup().count()"}
];

// Real intermediate papers that bridge pillars to products
const BRIDGES = [
  {id:"alexnet",short:"AlexNet",title:"ImageNet Classification with Deep CNNs (Krizhevsky, 2012)",cites:"95K",pillars:["backprop","cnn"]},
  {id:"resnet", short:"ResNet", title:"Deep Residual Learning for Image Recognition (He, 2016)",   cites:"120K",pillars:["backprop","cnn"]},
  {id:"yolo",   short:"YOLO",   title:"You Only Look Once: Real-Time Object Detection (Redmon, 2016)",cites:"20K",pillars:["backprop","cnn"]},
  {id:"seq2seq",short:"Seq2Seq",title:"Sequence to Sequence Learning with Neural Networks (Sutskever, 2014)",cites:"22K",pillars:["lstm"]},
  {id:"cho2014",short:"Enc-Dec",title:"Learning Phrase Representations using RNN Encoder-Decoder (Cho, 2014)",cites:"24K",pillars:["lstm","attention"]},
  {id:"transformer",short:"Transformer",title:"Attention Is All You Need (Vaswani, 2017)",cites:"95K",pillars:["attention","backprop"]},
  {id:"bert",   short:"BERT",   title:"BERT: Pre-training of Deep Bidirectional Transformers (Devlin, 2018)",cites:"80K",pillars:["attention","backprop","dropout"]},
  {id:"gpt2",   short:"GPT-2",  title:"Language Models are Unsupervised Multitask Learners (Radford, 2019)",cites:"15K",pillars:["attention","backprop","dropout"]},
  {id:"gan",    short:"GAN",    title:"Generative Adversarial Networks (Goodfellow, 2014)",cites:"55K",pillars:["backprop","dropout"]},
  {id:"glove",  short:"GloVe",  title:"GloVe: Global Vectors for Word Representation (Pennington, 2014)",cites:"27K",pillars:["word2vec"]},
  {id:"adam",   short:"Adam",   title:"Adam: A Method for Stochastic Optimization (Kingma, 2015)",cites:"100K",pillars:["dropout","backprop"]},
  {id:"alphafold",short:"AlphaFold",title:"Highly accurate protein structure prediction (Jumper, 2021)",cites:"14K",pillars:["attention","backprop","dropout"]}
];

const PRODUCTS = [
  {id:"chatbot",    name:"Chatbot / LLM",             bridges:["gpt2","bert","transformer"]},
  {id:"image_gen",  name:"AI Image Generation",        bridges:["gan","resnet"]},
  {id:"protein",    name:"Protein Structure Pred.",    bridges:["alphafold"]},
  {id:"self_driving",name:"Self-driving Perception",   bridges:["yolo","resnet"]},
  {id:"face_unlock",name:"Face Unlock",                bridges:["alexnet","resnet"]},
  {id:"search",     name:"Semantic Search / RAG",      bridges:["bert","glove","transformer"]},
  {id:"voice",      name:"Voice Assistant",            bridges:["seq2seq","cho2014"]},
  {id:"translation",name:"Neural Translation",         bridges:["seq2seq","transformer","cho2014"]},
  {id:"predictive", name:"Predictive Text",            bridges:["glove","bert"]},
  {id:"medical",    name:"Medical Imaging AI",         bridges:["resnet","alexnet"]},
  {id:"writing",    name:"AI Writing Assistant",       bridges:["gpt2","bert"]},
  {id:"recommendation",name:"Recommendation Engine",  bridges:["glove","adam"]},
  {id:"code",       name:"AI Code Completion",         bridges:["gpt2","bert"]},
  {id:"robots",     name:"Package Sorting Robots",     bridges:["yolo","resnet"]},
  {id:"drug",       name:"Drug Discovery AI",          bridges:["bert","alphafold"]},
  {id:"music",      name:"Music Recommendation",       bridges:["glove","adam"]},
  {id:"cancer",     name:"Cancer Detection",           bridges:["resnet","alexnet"]},
  {id:"plant",      name:"Plant Disease Detection",    bridges:["alexnet"]},
  {id:"ad",         name:"Ad Targeting Model",         bridges:["glove","adam"]}
];

const DOMAIN_COLORS={Transformers:"#3b82f6",CNNs:"#10b981",RNNs:"#8b5cf6",RL:"#f59e0b",NLP:"#f97316"};
const fmtK=n=>n>=1000?(n/1000).toFixed(0)+"K":String(n);
